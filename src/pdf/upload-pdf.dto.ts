// src/pdf/upload-pdf.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UploadPdfDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file: any;
}
