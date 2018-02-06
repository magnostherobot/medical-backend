function typeCheckerGenerator<T>(test: T): (v: any) => v is T {
  let f = (value): value is T =>
    value != null && value.constructor === test.constructor;
  return f;
}

let isObject    = typeCheckerGenerator<Object>({});
let isNumber    = typeCheckerGenerator<Number>(0);
let isString    = typeCheckerGenerator<String>("");
let isBoolean   = typeCheckerGenerator<Boolean>(true);
let isArray     = typeCheckerGenerator<Array<any>>([]);
let isFunction  = typeCheckerGenerator<Function>(new Function());
let isNull      = (v) => v === null;
let isUndefined = (v) => v === undefined;
let isPresent   = (v) => !isUndefined(v);
let isInteger   = (value: any) => isNumber(value)
                               && Number.isInteger(value as number);

let types = {
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
