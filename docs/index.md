---
layout: page
title: Gridgram
aside: false
sidebar: false
---

<div class="gg-lang-select">
  <h1>Gridgram</h1>
  <p class="gg-lang-select__tagline-en">Diagrams for the AI era</p>
  <p class="gg-lang-select__tagline-ja">AI 時代の図版ジェネレータ</p>
  <div class="gg-lang-select__btns">
    <a href="/en/" class="btn btn-primary btn-lg">English</a>
    <a href="/ja/" class="btn btn-primary btn-lg">日本語</a>
  </div>
</div>

<style>
.gg-lang-select {
  min-height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
}
.gg-lang-select h1 {
  font-size: 3rem;
  font-weight: 700;
  margin: 0;
}
.gg-lang-select p {
  font-size: 1.25rem;
  opacity: 0.8;
  margin: 0;
}
.gg-lang-select__tagline-en { margin-top: 4px; }
.gg-lang-select__tagline-ja { margin-bottom: 32px; }
.gg-lang-select__btns {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}
</style>
