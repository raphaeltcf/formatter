import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PdfService } from './pdf.service';
import { Response } from 'express';
import { UploadPdfDto } from './upload-pdf.dto';
import { Express } from 'express';

@ApiTags('pdf')
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'PDF file to be uploaded',
    type: UploadPdfDto,
  })
  @ApiResponse({
    status: 201,
    description: 'PDF corrigido retornado com sucesso.',
  })
  @ApiResponse({ status: 500, description: 'Erro ao processar PDF.' })
  async uploadPdf(
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ) {
    console.log('Recebendo arquivo PDF');

    try {
      const correctedPdf = await this.pdfService.processPdf(file);
      console.log('PDF corrigido gerado com sucesso');

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=corrected.pdf',
      });
      res.send(correctedPdf);
    } catch (error) {
      console.error('Erro ao processar PDF:', error.message);
      res.status(500).send('Erro ao processar PDF');
    }
  }
}
