function typeCheckerGenerator<T>(test: T): (v: any) => v is T {
  let f = (value): value is T =>
    value != null && value.constructor === test.constructor;
  return f;
}

export const isObject    = typeCheckerGenerator<Object>({});
export const isNumber    = typeCheckerGenerator<Number>(0);
export const isString    = typeCheckerGenerator<String>("");
export const isBoolean   = typeCheckerGenerator<Boolean>(true);
export const isArray     = typeCheckerGenerator<Array<any>>([]);
export const isFunction  = typeCheckerGenerator<Function>(new Function());
export const isNull      = (v) => v === null;
export const isUndefined = (v) => v === undefined;
export const isPresent   = (v) => !isUndefined(v);
export const isInteger   = (value: any) => isNumber(value)
  && Number.isInteger(value as number);

const types = {
  object:      isObject,
  number:      isNumber,
  string:      isString,
  boolean:     isBoolean,
  array:       isArray,
  function:    isFunction,
  integer:     isInteger,
  null:        isNull,
  not_present: isUndefined,
  undefined:   isUndefined,
  anything:    isPresent
};
export default types;
