import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import sharp from 'sharp';
import { Request } from 'express';

@Controller('reports/closing-upload')
export class ClosingUploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (
          req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, destination: string) => void,
        ) => {
          const uploadPath = join(process.cwd(), 'public', 'uploads', 'closing');
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (
          req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `closing-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
          return cb(
            new BadRequestException('Only image files are allowed!'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadClosingEvidence(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Process with sharp for optimization (Premium experience: fast loading)
    try {
      const filePath = file.path;
      const directory = join(process.cwd(), 'public', 'uploads', 'closing');
      const finalFilename = `opt-${file.filename.split('.')[0]}.webp`;
      const finalPath = join(directory, finalFilename);

      await sharp(filePath)
        .resize({
          width: 1280,
          height: 720,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toFile(finalPath);

      // We can keep the original or delete it. For now, let's just return the optimized one.
      return { url: `/uploads/closing/${finalFilename}` };
    } catch (err) {
      console.error('Sharp processing error for closing evidence', err);
      // Fallback to original if sharp fails
      return { url: `/uploads/closing/${file.filename}` };
    }
  }
}
