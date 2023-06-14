import { DurationModel } from '../models/duration-model';
import fnsAdd from 'date-fns/add';
import fnsDifferenceInMilliseconds from 'date-fns/differenceInMilliseconds';
import format from 'date-fns/format';
import fnsFromUnixTime from 'date-fns/fromUnixTime';
import getUnixTime from 'date-fns/getUnixTime';
import fnsIsBefore from 'date-fns/isBefore';

export class DateHelper {
  public static add(date: Date | number, values: DurationModel) {
    return fnsAdd(date, values);
  }

  public static differenceInMilliseconds(dateLeft: Date | number, dateRight: Date | number) {
    return fnsDifferenceInMilliseconds(dateLeft, dateRight);
  }

  public static formatDate(date: Date | number, newFormat: string): string {
    return format(date, newFormat);
  }

  public static fromUnixTime(unixTime: number) {
    return fnsFromUnixTime(unixTime);
  }

  public static getUnix(date: Date | number) {
    return getUnixTime(date);
  }

  public static isBefore(dateToCompare: Date | number, date: Date | number): boolean {
    return fnsIsBefore(dateToCompare, date);
  }
}
