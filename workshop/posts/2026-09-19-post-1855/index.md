---
description: ""
date: "2026-09-19"
categories: ["AI"]
title: "從動手做到Agentic AI 驗證"
subtitle: "AI 算出答案，就代表答案正確嗎？"
slides: "https://drive.google.com/drive/folders/1lhBog3jROoxZ5V9mx2W4cLNLHhnseFQv?usp=drive_link"
handout: "https://drive.google.com/drive/folders/1lhBog3jROoxZ5V9mx2W4cLNLHhnseFQv?usp=drive_link"
youtube: "https://youtu.be/RXCQBrE0Few"
---

當 AI 能快速產生程式碼與分析結果，我們是否還需要親手計算？本影片從這個問題出發，以 UCI Online Retail 真實零售交易資料為案例，帶領學習者從手動操作，逐步走向 AI 輔助分析與 Agentic AI 驗證流程。

課程首先安排「Feel the Pain」實作，透過 Excel 觀察原始資料，理解一筆商品明細、一張發票與一位客戶之間的差異，再練習筆數統計、交易金額計算、重複值辨識與缺漏檢查。這些操作不只是熟悉工具，更是建立對資料範圍、計算單位與判斷規則的理解。

接著，學習者將任務整理成提示詞，交由 AI 產生 Python 程式碼，再於 Google Colab 中檢查與執行。提示詞、程式碼、AI 回覆及答案欄分開呈現，讓每個步驟清楚可見，也保留修改、比較與追查錯誤的空間。

分析內容涵蓋交易分類、分組加總與 Pareto 80/20 累積分析。例如，「前 20% 商品貢獻多少金額」與「達到 80% 金額需要多少商品」，看似相近，實際上是不同問題，必須使用正確的排序、分母與計算方式。

最後，影片進一步介紹 Agentic AI 如何串接計算工具與獨立驗證。判斷結果是否可信，不能只依賴 AI 的文字說明，而要回到原始資料、控制總數與可重現的計算證據。從動手做到驗證，真正要培養的，是能指揮 AI，也能查核 AI 的能力。
