import { default as types } from './types';

type matchType<T = any>
  = (boolean | ((T) => boolean));

export function match(template: Object, value?: Object): matchType<Object> {
  if (value === undefined) {
    return match.bind(null, template);
  }

  for (let k of Object.keys(template)) {
    if (!template[k](value[k])) {
      return false;
    }
  }
  return true;
}

export function exact(template: Object, value?: Object): matchType<Object> {
  if (value === undefined) {
    return exact.bind(null, template);
  }

  let k1 = Object.keys(template);
  let k2 = Object.keys(value);

  return match(template, value)
      && k2.every((x) => k1.indexOf(x) < 0);
}

export function optional(template: Function, value?: any): matchType<any> {
  if (value === undefined) {
    return optional.bind(null, template);
  }

  return types.undefined(value)
      || template(value);
}

export function alternative(templates: any[], value?: any): matchType<any> {
  if (value === undefined) {
    return alternative.bind(null, templates);
  }

  if (templates.length === 0) {
    return false;
  } else {
    let t = templates.map((x) => {
      if (types.function(x)) {
        return x;
      } else if (types.object(x)) {
        return match(x);
      } else {
        return (v) => x === v;
      }
    });
    return t.some((x) => x(value));
  }
}

export function array(template: Object, values?: Array<Object>):
matchType<Array<Object>> {
  if (values === undefined) {
    return array.bind(null, template);
  }

  let m = match(template) as ((Object) => boolean);
  return values.every(m);
}
