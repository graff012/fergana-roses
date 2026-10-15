import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { basename, join } from 'path';

const prisma = new PrismaClient();

const DATA_DIR = join(process.cwd(), 'data', 'fergana-roses-catalog-2024');
const SOURCE_JSON = join(DATA_DIR, 'source_records.json');
const IMAGES_DIR = join(process.cwd(), 'public', 'images', 'catalog-2024');

const UNCATEGORIZED = 'Без категории';
const DEFAULT_PRICE = process.env.CATALOG_DEFAULT_PRICE ?? '0';
const DEFAULT_STOCK = Number(process.env.CATALOG_DEFAULT_STOCK ?? '0');

interface SourceRecord {
  catalogNumber: number;
  name: string;
  smell: string;
  size: string;
  height: string;
  image: string;
  categoryName: string;
  reviewNotes: string;
}

/** Port of build_fergana_catalog.py::fragrance — raw PDF text -> API smell. */
function normalizeSmell(raw: string): string {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return '';
  if (s.startsWith('сред') || s.startsWith('сиред')) return 'AVERAGE';
  if (s.startsWith('сил') || s.startsWith('нос')) return 'STRONG';
  if (['лёгкий', 'легкий', 'лекий'].includes(s)) return 'WEAK';
  if (s === 'приятный') return raw.trim(); // intensity unspecified; flagged in reviewNotes
  throw new Error(`Unknown fragrance in source: "${raw}"`);
}

function loadRecords(): SourceRecord[] {
  if (!existsSync(SOURCE_JSON)) {
    throw new Error(`Source records not found: ${SOURCE_JSON}`);
  }
  const records = JSON.parse(
    readFileSync(SOURCE_JSON, 'utf-8'),
  ) as SourceRecord[];
  records.sort((a, b) => a.catalogNumber - b.catalogNumber);
  return records;
}

function resolveImage(csvImage: string): { imgUrl: string; exists: boolean } {
  const file = basename(csvImage.trim());
  return {
    imgUrl: `images/catalog-2024/${file}`,
    exists: existsSync(join(IMAGES_DIR, file)),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const onlyArg = args.find((a) => a.startsWith('--only='))?.split('=')[1];
  const only = onlyArg
    ? new Set(onlyArg.split(',').map((s) => s.trim()))
    : null;

  let rows = loadRecords();
  if (only) {
    rows = rows.filter((r) => only.has(String(r.catalogNumber)));
    if (rows.length !== only.size) {
      throw new Error(
        `--only mismatch: requested ${only.size}, matched ${rows.length}`,
      );
    }
  }

  console.log(`Loaded ${rows.length} catalog rows from source_records.json`);
  console.log(
    `Defaults: price="${DEFAULT_PRICE}" stock=${DEFAULT_STOCK} missing-category="${UNCATEGORIZED}"`,
  );
  console.log(`Mode: ${apply ? 'APPLY (writes to DB)' : 'DRY-RUN (no writes)'}`);

  const errors: string[] = [];
  const categoryNames = new Set<string>();

  for (const r of rows) {
    const prefix = `#${r.catalogNumber} ${r.name}`;
    if (!r.name?.trim() || r.name.trim().length > 250) {
      errors.push(`${prefix}: name must contain 1-250 characters`);
    }
    try {
      const smell = normalizeSmell(r.smell ?? '');
      if (smell.length > 250) errors.push(`${prefix}: smell exceeds 250 chars`);
    } catch (e) {
      errors.push(`${prefix}: ${(e as Error).message}`);
    }
    for (const [label, value] of [
      ['flowerSize', (r.size ?? '').replace('=', '-')],
      ['height', r.height ?? ''],
    ] as const) {
      if ((value ?? '').length > 250) {
        errors.push(`${prefix}: ${label} exceeds 250 characters`);
      }
    }
    const cat = (r.categoryName ?? '').trim() || UNCATEGORIZED;
    categoryNames.add(cat);
    const { exists } = resolveImage(r.image);
    if (!exists) errors.push(`${prefix}: image file missing for ${r.image}`);
  }

  console.log(
    `Categories to ensure (${categoryNames.size}): ${[...categoryNames].sort().join(' | ')}`,
  );
  const flagged = rows.filter((r) => (r.reviewNotes ?? '').trim());
  console.log(
    `Rows carrying source reviewNotes (imported anyway, see data package): ${flagged.length}`,
  );

  if (errors.length > 0) {
    console.error(`${errors.length} validation errors. First 20:`);
    for (const e of errors.slice(0, 20)) console.error(`  ${e}`);
    process.exitCode = 2;
    return;
  }
  console.log('Validation passed: all names, fields and image files OK.');

  if (!apply) {
    console.log('Dry-run complete. Re-run with --apply to write to the DB.');
    console.log('Example: npx ts-node scripts/import-catalog-2024.ts --apply');
    return;
  }

  const existing = await prisma.flower.findMany({ select: { name: true } });
  const existingNames = new Set(
    existing.map((f) => f.name.trim().toLowerCase()),
  );

  const categoryIdByName = new Map<string, string>();
  for (const name of categoryNames) {
    let category = await prisma.category.findFirst({ where: { name } });
    if (!category) {
      category = await prisma.category.create({ data: { name } });
      console.log(`Created category: ${name} (${category.id})`);
    }
    categoryIdByName.set(name, category.id);
  }

  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    if (existingNames.has(key)) {
      skipped++;
      console.log(`Skip existing: #${row.catalogNumber} ${row.name}`);
      continue;
    }
    const categoryName = (row.categoryName ?? '').trim() || UNCATEGORIZED;
    const { imgUrl } = resolveImage(row.image);

    await prisma.flower.create({
      data: {
        name: row.name.trim(),
        smell: normalizeSmell(row.smell ?? ''),
        flower_size: (row.size ?? '').replace('=', '-').trim(),
        height: (row.height ?? '').trim(),
        price: DEFAULT_PRICE,
        stock: DEFAULT_STOCK,
        img_url: imgUrl,
        category: { connect: { id: categoryIdByName.get(categoryName)! } },
      },
    });
    existingNames.add(key);
    created++;
    console.log(`Imported #${row.catalogNumber}: ${row.name}`);
  }

  console.log(`Done. Created ${created}, skipped ${skipped} existing.`);
}

main()
  .catch((e) => {
    console.error('Import failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
