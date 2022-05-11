
// Time constants
export const S = 1000
export const M = 60 * S
export const H = 60 * M
export const D = 24 * H
export const W = 7 * D

const nearest = range => ts => Math.floor(ts / range) * range
export const nearestHour = nearest(H)
export const nearestDay = nearest(D)
