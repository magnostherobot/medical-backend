import { default as types } from './types';

export function rough(template: Object, value: Object): boolean {
  for (let k of Object.keys(template)) {
    if (!template[k](value[k])) {
      return false;
    }
  }
  return true;
}

export function match(template: Object): (Object) => boolean {
  return rough.bind(null, template);
}

export function exact(template: Object): (Object) => boolean {
  let m = match(template);
  let revm = (value: Object) => rough(value, template);
  return (v) => m(v) && revm(v);
}

export function optional(template: Function): (any) => boolean {
  return (v) => types.undefined(v)
             || template(v);
}

export function alternative(templates: any[]) {
  if (templates.length === 0) {
    return () => false;
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
    return (v) => t.some((x) => x(v));
  }
}

export function array(template: Object): (Array) => boolean {
  let m = match(template);
  return (v) => v.every(m);
}
