// ================
// INSPIRED BY SICP
// ================

// Crutial idea of streams is delayed evaluation.
// In JavaScript it can be easily done with lambdas.
// Assuming that we already have first element of the stream evaluated
// all we have to do is to make rest of the stream a fuction of no arguments
// that will evaluate the next element of the stream that actually is a stream too.

// UTILS
// eval rest of the stream
const evaluate = f => f();
// we are using memoized evaluations for stream-tail
const memoize = f => {
  let isDone = false;
  let value = null;

  return (...args) => {
    if (isDone) {
      return value;
    }

    const result = f(...args);
    isDone = true;
    value = result;
    return result;
  };
};

// CONSTRUCTOR AND SELECTORS
const stream = (head, tail) => f => f(head, memoize(tail));
const head = s => s(x => x);
const tail = s => s(_, y => evaluate(y));
const theEmptyStream = Symbol('THE_EMPTY_STREAM');
const isEmpty = s => s === theEmptyStream;

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
    () => map(iteratee, ...streamArgs.map(tail)),
  );
};

// works like array map
const filter = (predicate, s) => {
  if (isEmpty(s)) {
    return theEmptyStream;
  }

  const first = head(s);
  if (predicate(first)) {
    return stream(
      first,
      () => filter(predicate, tail(s)),
    );
  }
  return filter(prdicate, tail(s));
};

// provides a way to iterative stream reduction
// returns a stream that will contain accumulator value of every reduce iteration
const reduce = (iteratee, s, acc) => {
  if (isEmpty(s)) {
    return acc;
  }

  return stream(
    acc,
    () => reduce(
      iteratee,
      tail(s),
      iteratee(acc, head(s)),
    ),
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

// take n elements of the stream and return as an array
const take = (s, n) => {
  const iter = (acc, s, coounter) => {
    if (counter === 0 || isEmpty(s)) {
      return acc;
    }
    return iter([...acc, head(s)], tail(s), counter - 1);
  };
  return iter([], s, n);
};

// returns rest of the stream from nth element
const slice = (s, from = 0) => {
  if (from === 0 || isEmpty(s)) {
    return s;
  }

  return slice(tail(s), from - 1);
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
    return stream(h2, () => merge(s1, tail(s2)));
  }
  if (h1 < h2) {
    return stream(h1, () => merge(tail(s1), s2));
  }
  return stream(h1, () => merge(tail(s1), tail(s2)));
};


// TODO: add unshift procedure

// stringify n of stream items
// TODO: add "..." to show that stream is not empty and "!" to show the empty stream pointer
const toString = (s, n) => {
  const stringified = take(s, n).reduce((acc, item) => `${acc}${item} `, '');
  return `< ${stringified}>`;
};

// ITERATOR WRAPPER
// TODO: improve iterator wrapper
class Iterator {
  constructor(s, count = 1) {
    this.stream = s;
    this.count = count;
  }

  getStream() {
    return this.stream;
  }

  take(n) {
    this.count = n;
    return this;
  }

  skip(n) {
    this.stream = slice(this.stream, n);
    return this;
  }

  iter() {
    const result = take(this.stream, this.count);
    this.stream = slice(this.stream, this.count);
    return result;
  }
}


// IMPLEMENTING SEQUENCES USING STREAMS

// integers implementation
const integersFrom = n => stream(n, () => integersFrom(n + 1));
const integers = integersFrom(0);

// another way to implement integers
const ones = stream(1, () => ones);
const ints = stream(0, () => addStreams(ones, ints));

// factorial implementation in terms of reduce
const fact = reduce(
  (x, y) => x * y,
  integersFrom(1),
  1,
);

// factorial implementation in terms of mulStreams
const factorial = stream(
  1,
  () => mulStreams(tail(ints), factorial),
);

// stream of fibonacci numbers
const fibs = stream(
  0,
  () => stream(
    1,
    () => addStreams(fibs, tail(fibs)),
  ),
);

// stream of primes
const sieve = s => stream(
  head(s),
  () => filter(
    x => x % head(s) !== 0,
    tail(s),
  ),
);
const primes = sieve(integersFrom(2));
