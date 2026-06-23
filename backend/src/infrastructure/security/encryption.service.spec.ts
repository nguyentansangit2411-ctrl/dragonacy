import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test_secret_key_32_characters_!!'),
          },
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should encrypt a text string and return encrypted hex string and iv', () => {
    const rawText = 'my-super-secret-facebook-token-12345';
    const result = service.encrypt(rawText);

    expect(result).toBeDefined();
    expect(result.encryptedText).toContain(':'); // Separated by authTag
    expect(result.iv).toBeDefined();
    expect(result.iv.length).toBe(24); // 12 bytes in hex = 24 chars
  });

  it('should decrypt an encrypted string back to the original text', () => {
    const rawText = 'facebook-access-token';
    const encrypted = service.encrypt(rawText);
    const decrypted = service.decrypt(encrypted.encryptedText, encrypted.iv);

    expect(decrypted).toBe(rawText);
  });

  it('should throw an error if the authentication tag is tampered with', () => {
    const rawText = 'secret-data';
    const encrypted = service.encrypt(rawText);
    
    // Decompose and modify ciphertext
    const [cipherText, authTag] = encrypted.encryptedText.split(':');
    const tamperedCipherText = cipherText.substring(0, cipherText.length - 2) + '00';
    const tamperedEncryptedText = `${tamperedCipherText}:${authTag}`;

    expect(() => {
      service.decrypt(tamperedEncryptedText, encrypted.iv);
    }).toThrow('Decryption failure');
  });

  it('should throw an error if the authentication tag is missing', () => {
    const rawText = 'secret-data';
    const encrypted = service.encrypt(rawText);
    const [cipherText] = encrypted.encryptedText.split(':'); // Drop authTag

    expect(() => {
      service.decrypt(cipherText, encrypted.iv);
    }).toThrow('Decryption failure');
  });
});
