/** A small, resolution-independent Fern mark for the loading and compatibility UI. */
export function fernMark(size = 56) {
  return `<svg class="fern-mark" width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">
    <path fill="#bd854c" d="M7 18a10 10 0 1 1 19-3L11 29a10 10 0 0 1-4-11Zm31-3a10 10 0 1 1 15 14L38 15Z"/>
    <path fill="#fbebcd" stroke="#9a744e" d="M9 28Q5 23 11 20q-1-7 6-7 3-6 9-4 5-5 11 0 7-2 10 4 7 0 7 7 5 3 2 9 1 18-13 24-11 5-22 0C12 49 8 42 9 28Z"/>
    <path fill="#dfa860" d="M12 30q0-5 4-8 4 1 7-5 5 3 9-2 4 5 10 2 2 6 7 5 4 4 4 8 0 18-14 22l-7 1-7-1C16 49 12 40 12 30Z"/>
    <path fill="#f0bf7f" d="M16 33q4-10 16-9 13-1 17 9v6q-2 10-17 11Q18 49 16 39Z"/>
    <ellipse fill="#42281f" cx="23" cy="35.5" rx="2.4" ry="3.2"/>
    <ellipse fill="#42281f" cx="41" cy="35.5" rx="2.4" ry="3.2"/>
    <path stroke="#7b482f" stroke-width="1.1" stroke-linecap="round" d="M27 42q5 6 10 0"/>
    <ellipse fill="#b8632d" cx="32" cy="40" rx="3.5" ry="2.3"/>
    <path fill="#fff2dc" stroke="#b99b72" d="M31 54q-7-7-11-2-3 5 7 5l-2 5 5-1 2-5 2 5 5 1-2-5q11 0 7-5-4-5-11 2Z"/>
  </svg>`;
}
