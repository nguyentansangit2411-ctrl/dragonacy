import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const secret = this.configService.get<string>('ENCRYPTION_KEY', 'default_encryption_key_32_chars_!');
    // Keep it exactly 32 bytes for AES-256
    this.key = Buffer.from(secret.padEnd(32, '!').substring(0, 32), 'utf8');
  }

  /**
   * Encrypts plain text using AES-256-GCM
   * @param text The cleartext to encrypt
   * @returns An object containing the encrypted hex string and iv
   */
  encrypt(text: string): { encryptedText: string; iv: string } {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag().toString('hex');

      // Append auth tag to the encrypted text separated by colon
      return {
        encryptedText: `${encrypted}:${authTag}`,
        iv: iv.toString('hex'),
      };
    } catch (error) {
      this.logger.error('Failed to encrypt text:', error);
      throw new Error('Encryption failure');
    }
  }

  /**
   * Decrypts encrypted text using AES-256-GCM
   * @param encryptedText The colon-separated string format (encrypted:authTag)
   * @param ivHex The hex representation of the IV
   * @returns The decrypted cleartext
   */
  decrypt(encryptedText: string, ivHex: string): string {
    try {
      const parts = encryptedText.split(':');
      const encrypted = parts[0];
      const authTag = parts[1];

      if (!authTag) {
        throw new Error('Authentication tag is missing for decryption.');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(authTag, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt text:', error);
      throw new Error('Decryption failure');
    }
  }
}
