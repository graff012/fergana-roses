import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ENDIPOINTS from '../../common/constants/endpoints';

@Injectable()
export class SmsService {
  private readonly email: string;
  private readonly password: string;

  constructor(private readonly configService: ConfigService) {
    this.email = configService.get('ESKIZ_EMAIL') as string;
    this.password = configService.get('ESKIZ_PASSWORD') as string;
  }

  async getToken() {
    try {
      const url = ENDIPOINTS.getEskizTokenUrl();

      const formData = new FormData();

      formData.set('email', this.email);
      formData.set('password', this.password);

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Eskiz token request failed with status ${response.status}`);
      }

      const {
        data: { token },
      } = (await response.json()) as { data: { token: string } };

      return token;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async sendSms(phone_number: string, otp: string) {
    const url = ENDIPOINTS.sendSmsUrl();

    const token = await this.getToken();

    const formData = new FormData();

    formData.set('mobile_phone', phone_number);
    formData.set('message', `Fergana Roses ilovasiga kirish kodi:${otp}`);
    formData.set('from', '4546');

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Server error');
    }
  }
}
