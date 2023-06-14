export class ArrayHelper {
  public static findNested = (arr: Array<any>, itemId: any, nestingKey: string = 'children'): any =>
    arr.reduce((a, item) => {
      if (a) {
        return a;
      }
      if (item.id === itemId) {
        return item;
      }
      if (item[nestingKey]) {
        return ArrayHelper.findNested(item[nestingKey], itemId, nestingKey);
      }
    }, null);
}
