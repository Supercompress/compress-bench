"use strict";
/** Seeded PRNG (mulberry32) + FNV-1a seed hashing. No Math.random anywhere in the bench. */

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function hashSeed(...parts) {
  return fnv1a(parts.map(String).join("␟"));
}

class Rng {
  constructor(seed) {
    this.state = (Number(seed) >>> 0) || 0x9e3779b9;
  }
  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(lo, hi) {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }
  float(lo, hi) {
    return lo + this.next() * (hi - lo);
  }
  chance(p) {
    return this.next() < p;
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
  pickN(arr, n) {
    return this.shuffle(arr.slice()).slice(0, n);
  }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  hex(n) {
    let s = "";
    for (let i = 0; i < n; i++) s += "0123456789abcdef"[this.int(0, 15)];
    return s;
  }
  alnum(n, upper = false) {
    const a = upper ? "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" : "abcdefghjkmnpqrstuvwxyz23456789";
    let s = "";
    for (let i = 0; i < n; i++) s += a[this.int(0, a.length - 1)];
    return s;
  }
  /** Fork a child stream so adding draws in one place doesn't shift others. */
  fork(label) {
    return new Rng(hashSeed(this.state, label));
  }
}

module.exports = { Rng, hashSeed, fnv1a };
