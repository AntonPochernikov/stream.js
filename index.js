// ================
// INSPIRED BY SICP
// ================

// Crutial idea of streams is delayed evaluation.
// In JavaScript it can be easily done with lambdas.
// Assuming that we already have first element of the stream evaluated
// all we have to do is to make rest of the stream a fuction of no arguments
// that will evaluate the next element of the stream that actually is a stream too.

// UTILS
// we are using memoized evaluations for stream-tail
const memoize = (f) => {
  let isDone = false;
  let result = null;

  return (...args) => {
    if (isDone) {
      return result;
    }

    result = f(...args);
    isDone = true;
    return result;
  };
};
const delay = exp => memoize(exp);
// evaluate rest of the stream
const force = f => f();

// CONSTRUCTOR AND SELECTORS
const stream = (head, tail) => {
  const select = selector => selector(head, tail);
  select.isStream = true;
  return select;
};
const head = s => s(x => x);
const tail = s => s((_, y) => force(y));
const theEmptyStream = Symbol('THE_EMPTY_STREAM');
const isEmpty = s => s === theEmptyStream;
const isStream = value => typeof value === 'function' && !!value.isStream;

// OPERATIONS
// get nth element of stream
const ref = (s, n = 0) => {
  if (isEmpty(s)) {
    return theEmptyStream;
  }
  if (n === 0) {
    return head(s);
  }
  return ref(tail(s), n - 1);
};

// unlike array map
// stream map will accept unlimited amount of streams
const map = (iteratee, ...streamArgs) => {
  if (streamArgs.some(isEmpty) || streamArgs.length === 0) {
    return theEmptyStream;
  }
  const args = streamArgs.map(head);

  return stream(
    iteratee(...args),
    delay(() => map(iteratee, ...streamArgs.map(tail))),
  );
};

// works like array filter
const filter = (predicate, s) => {
  if (isEmpty(s)) {
    return theEmptyStream;
  }

  const first = head(s);
  if (predicate(first)) {
    return stream(
      first,
      delay(() => filter(predicate, tail(s))),
    );
  }
  return filter(predicate, tail(s));
};

// provides a way to iterative stream reduction
// returns a stream that will contain accumulated value of every reduce iteration
const reduce = (iteratee, s, acc) => {
  if (isEmpty(s)) {
    return acc;
  }

  return stream(
    acc,
    delay(() => reduce(
      iteratee,
      tail(s),
      iteratee(acc, head(s)),
    )),
  );
};

// scale stream by factor
const scale = (s, factor) => map(x => x * factor, s);

// add streams
const addStreams = (...streams) => map(
  (...args) => args.reduce((acc, arg) => acc + arg, 0),
  ...streams,
);

// multiply streams
const mulStreams = (...streams) => map(
  (...args) => args.reduce((acc, arg) => acc * arg, 1),
  ...streams,
);

// take n elements of the stream and return them as an array
const take = (s, n) => {
  const iter = (acc, s, counter) => {
    if (counter === 0 || isEmpty(s)) {
      return acc;
    }
    return iter([...acc, head(s)], tail(s), counter - 1);
  };
  return iter([], s, n);
};

// returns rest of the stream from nth element
const slice = (s, from, to) => {
  if (from === 0 || isEmpty(s)) {
    return s;
  }

  return stream(
    head(s),
    delay(() => slice(tail(s), from - 1)),
  );
};

// merge two stream of comparable elements
const merge = (s1, s2) => {
  if (isEmpty(s1)) {
    return s2;
  }
  if (isEmpty(s2)) {
    return s1;
  }

  const h1 = head(s1);
  const h2 = head(s2);
  if (h1 > h2) {
    return stream(h2, delay(() => merge(s1, tail(s2))));
  }
  if (h1 < h2) {
    return stream(h1, delay(() => merge(tail(s1), s2)));
  }
  return stream(h1, delay(() => merge(tail(s1), tail(s2))));
};


// TODO: add unshift procedure

// stringify n of stream items
// TODO: add "..." to show that stream is not empty and "!" to show the empty stream pointer
const toString = (s, n) => {
  const stringified = take(s, n).reduce((acc, item) => `${acc}${item} `, '');
  return `< ${stringified}>`;
};

// IMPLEMENTING SEQUENCES USING STREAMS

// integers implementation
const integersFrom = n => stream(n, delay(() => integersFrom(n + 1)));
const integers = integersFrom(0);

// another way to implement integers
const ones = stream(1, delay(() => ones));
const ints = stream(0, delay(() => addStreams(ones, ints)));

// factorial implementation in terms of reduce
const fact = reduce(
  (x, y) => x * y,
  integersFrom(1),
  1,
);

// factorial implementation in terms of mulStreams
const factorial = stream(
  1,
  delay(() => mulStreams(tail(ints), factorial)),
);

// stream of fibonacci numbers
const fibs = stream(
  0,
  delay(() => stream(
    1,
    delay(() => addStreams(fibs, tail(fibs))),
  )),
);

// stream of primes
const sieve = s => stream(
  head(s),
  delay(() => filter(
    x => x % head(s) !== 0,
    tail(s),
  )),
);
const primes = sieve(integersFrom(2));

// ITERATOR WRAPPER
// TODO: improve iterator wrapper
class Iterator {
  constructor(s) {
    this.value = s;
  }

  map(proc) {
    return map(proc, this.value);
  }

  filter(proc) {
    return filter(proc, this.value);
  }

  reduce(proc, initial) {
    return reduce(proc, initial, this.value);
  }

  value() {
    if (isStream(this.value)) {
      return streamToArr(this.value);
    }
    return this.value;
  }
}

function arrToStream(arr) {
  if (arr.length === 0) {
    return theEmptyStream;
  }
  const [first, ...rest] = arr;
  return stream(first, delay(() => arrToStream(rest)));
}

function streamToArr(s) {
  if (isEmpty(s)) {
    return [];
  }
  const first = head(s);
  const rest = tail(s);
  return [first, ...streamToArr(rest)];
}

function wrap(value) {
  if (Array.isArray(value)) {
    const s = arrToStream(value);
    return new Iterator(s);
  }
  throw new Error('Wrapper used on non-array value');
}
const square = n => n ** 2;
const result = wrap([1, 2, 3]);

console.log(result.value());
