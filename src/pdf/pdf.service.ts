import { Injectable } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
import axios from 'axios';
import PDFDocument from 'pdfkit';
import * as Tesseract from 'tesseract.js';
import * as path from 'path';
import * as fs from 'fs';
import * as pdfPoppler from 'pdf-poppler';
import * as sharp from 'sharp';

@Injectable()
export class PdfService {
  async processPdf(file: Express.Multer.File): Promise<Buffer> {
    console.log('Iniciando processamento do PDF');

    const text = await this.extractTextFromPdf(file.buffer);
    console.log('Texto extraído do PDF:', text);

    const correctedText = await this.sendTextToChatGPT(text);
    console.log('Texto corrigido pelo ChatGPT:', correctedText);

    const pdfBuffer = await this.convertTextToPdf(correctedText);
    console.log('PDF gerado com o texto corrigido');

    return pdfBuffer;
  }

  private async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    console.log('Extraindo texto do PDF');
    const textFromPdfParse = await this.extractTextWithPdfParse(pdfBuffer);
    if (this.isTextValid(textFromPdfParse)) {
      return textFromPdfParse;
    }

    console.log('pdf-parse falhou, tentando Tesseract.js');
    const textFromTesseract = await this.extractTextWithTesseract(pdfBuffer);
    return textFromTesseract;
  }

  private async extractTextWithPdfParse(pdfBuffer: Buffer): Promise<string> {
    const data = await pdfParse(pdfBuffer);
    return data.text;
  }

  private isTextValid(text: string): boolean {
    return text.includes(' ') && text.length > 20;
  }

  private async extractTextWithTesseract(pdfBuffer: Buffer): Promise<string> {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const tempFilePath = path.join(tempDir, 'temp.pdf');
    fs.writeFileSync(tempFilePath, pdfBuffer);

    const options = {
      format: 'png',
      out_dir: tempDir,
      out_prefix: 'page',
      page: null,
    };

    await pdfPoppler.convert(tempFilePath, options);

    const imageFiles = fs
      .readdirSync(tempDir)
      .filter((file) => file.endsWith('.png'));
    let extractedText = '';

    for (const file of imageFiles) {
      const imagePath = path.join(tempDir, file);
      const {
        data: { text },
      } = await Tesseract.recognize(imagePath, 'eng', {
        logger: (m) => console.log(m),
      });
      extractedText += text + '\n';
      fs.unlinkSync(imagePath);
    }

    fs.unlinkSync(tempFilePath);
    return extractedText;
  }

  private async sendTextToChatGPT(text: string): Promise<string> {
    const prompt = `Corrija o seguinte texto: ${text}`;
    console.log('Enviando texto para o ChatGPT com o prompt:', prompt);

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Você é um assistente que corrige textos.',
            },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1024,
        },
        {
          headers: {
            Authorization: `Bearer YOUR_OPENAI_API_KEY`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('Resposta do ChatGPT:', response.data);

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error(
        'Erro ao enviar texto para o ChatGPT:',
        error.response ? error.response.data : error.message,
      );
      throw new Error('Erro ao comunicar com o ChatGPT');
    }
  }

  private async convertTextToPdf(text: string): Promise<Buffer> {
    console.log('Convertendo texto corrigido para PDF');
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    doc.text(text);
    doc.end();

    return Buffer.concat(buffers);
  }
}
