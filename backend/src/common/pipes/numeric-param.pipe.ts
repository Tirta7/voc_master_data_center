import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

/**
 * 🛡️ NumericParamPipe
 *
 * Tanpa ValidationPipe global, `@Param('id') id: number` sebenarnya tetap
 * berupa STRING saat runtime ("5" bukan 5). Ini menyebabkan bug halus seperti
 * `map.delete(id)` / `x.id === id` yang selalu gagal.
 *
 * Pipe ini HANYA mengonversi parameter route/query yang dideklarasikan bertipe
 * `number` DAN nilainya string numerik murni. Tidak ada validasi DTO, tidak
 * menyentuh @Body, tidak mengubah boolean — sehingga aman untuk endpoint lama.
 */
@Injectable()
export class NumericParamPipe implements PipeTransform {
  private static readonly NUMERIC = /^-?\d+(\.\d+)?$/;

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'param' && metadata.type !== 'query') return value;
    if (metadata.metatype !== Number) return value;
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    if (!NumericParamPipe.NUMERIC.test(trimmed)) return value;

    return Number(trimmed);
  }
}
