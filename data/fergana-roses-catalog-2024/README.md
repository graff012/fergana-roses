# Fergana Roses — 2024 flower catalog

Prepared from `/home/graff/Downloads/каталог 2024.pdf` on 2026-10-15, using the flower DTO, Prisma schema, admin form and upload controllers in `/home/graff/CODE/Projects/fergana-roses`.

## Files

- `fergana_roses_2024.xlsx`: 365 flower rows. Sheets: Readme, Flowers, Categories, Review and Fields.
- `images/`: 365 original embedded JPEG photos, named by catalog number and flower name. The `image` column links to the matching file.
- `flowers_2024.csv`: UTF-8 CSV copy for other import tools. Edit the Excel workbook for the included helper; it does not read the CSV.
- `image_manifest.csv`: image-to-flower mapping, PDF page, pixel size, file size and SHA-256 checksum.
- `source_records.json`: extracted original catalog text and image mapping.
- `validation_summary.json`: counts and the source PDF checksum.
- `import_catalog.py`: offline workbook validation and optional upload through the existing API.

## Prepare the workbook

1. Fill `price` with your current selling price in UZS and `stock` with your available quantity. These are absent from the PDF and deliberately blank. Use `0` stock where appropriate; prices must be positive for this helper.
2. Resolve the **14 rows with `reviewNotes`** in Flowers. Six have no category in the source; four also lack height, diameter and fragrance. Two additional entries lack fragrance. Other flags cover uncertain fragrance, suspicious measurements and source typing errors. Edit the fields as needed, then clear the resolved `reviewNotes` cell. The Review sheet remains an original snapshot; the helper checks Flowers.
3. Review Categories. There are ten normalized catalog groups. The existing live category `Cprey` (`fdf88c46-e05c-484d-b11e-05d53e2691d9`) is mapped to `Спрей` as spray roses. Other IDs are blank. Enter an existing UUID in Categories to map a group, or let the helper create missing categories explicitly. Missing categories on flower rows must be assigned to a name listed in Categories.
4. Keep the workbook beside its `images/` directory. Do not replace `image` with a remote URL; uploads send the actual file bytes.

Names retain catalog spellings. Obvious category and fragrance spelling variants are normalized; `source*` columns preserve the original field text. Fragrance uses `WEAK`, `AVERAGE` and `STRONG`. The descriptor `приятный` (pleasant) does not state intensity and is flagged for review. `носыщенный` (rich/intense) is mapped to `STRONG`. No botanical facts were looked up or guessed.

Bloom diameter and plant height are strings in centimeters, matching the project's form. `8=10` is normalized to `8-10` and flagged. `12-10` and `100-120` bloom diameters remain as written and are flagged. Printed catalog number `1402` is represented as `140`, between entries 139 and 141, with the original number retained in source_records.json.

Photos preserve the PDF's original JPEG bytes and resolution (usually 281 × 346 pixels), including any borders already in the source image. Entry #42 is reflected horizontally by the PDF's page layout; the exported image retains its original embedded orientation. Photos are not enlarged or AI generated.

## Import

The inspected application has **no built-in Excel import**. Its existing endpoint is `POST /api/flowers/create`, with multipart fields `name`, `smell`, `flowerSize`, `height`, `price`, `stock`, `categoryId` and file field `image`. The helper supplies this workflow without changing the project.

Requires Python 3.10+ and `openpyxl` (already installed in the current environment). From this package directory, validate offline:

```sh
python import_catalog.py
```

Validation makes no network requests and reports missing prices, stock and unresolved notes. Exit code 2 means the workbook needs attention. Validate a few selected rows with `--only 1,2,3`.

After completing the workbook, explicitly upload:

```sh
python import_catalog.py --apply \
  --api-url https://fergana-roses-production.up.railway.app/api \
  --create-categories
```

The helper prompts privately for your admin bearer token, or reads `FERGANA_ADMIN_TOKEN` if already set. It reads existing flowers/categories, validates category IDs, refuses existing flower names, creates missing categories only with `--create-categories`, then uploads each flower and photo. For a different deployment, update existing category UUIDs in both Flowers and Categories first.

Successful uploads are recorded immediately in `import_results.jsonl`. It stops on the first failure and does not automatically retry requests or roll back successful uploads. After a partial run, inspect the log and the app, then use `--only` for the remaining catalog numbers. Duplicate flower names on the server stop a selected batch before any writes.

**No live flowers or categories were created while preparing this package.** The live categories endpoint was read to establish the existing category mapping. No admin credentials are included.

## Rebuild

The neighboring `../build_fergana_catalog.py` rebuilds the workbook and extracted images using Poppler (`pdftohtml`), Pillow and openpyxl. Rebuilding overwrites generated files; use a different output directory to preserve workbook edits:

```sh
python ../build_fergana_catalog.py \
  --pdf '/home/graff/Downloads/каталог 2024.pdf' \
  --out /tmp/fergana-catalog-rebuilt
```
