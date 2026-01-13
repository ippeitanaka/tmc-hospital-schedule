"use server"

/**
 * 統合CSVフォーマットのテンプレートを生成
 * フォーマット: 学籍番号,氏名,ふりがな,性別,生年月日,年齢,病院,クラス,班,日付,記号,説明
 */
export async function generateTemplateCSV() {
  try {
    // Create CSV content with BOM
    let csv = "\ufeff" // BOM for UTF-8
    csv += "学籍番号,氏名,ふりがな,性別,生年月日,年齢,病院,クラス,班,日付,記号,説明\n"
    
    // サンプルデータを3行追加
    csv += "A001,山田太郎,やまだたろう,男,1995-04-01,30,〇〇病院,昼間部,A班,2026/2/1,〇,病院実習\n"
    csv += "A001,山田太郎,やまだたろう,男,1995-04-01,30,〇〇病院,昼間部,A班,2026/2/2,学,学校登校\n"
    csv += "A002,佐藤花子,さとうはなこ,女,1996-05-15,29,△△病院,夜間部,B班,2026/2/1,〇,病院実習\n"
    
    return { success: true, csv }
  } catch (error) {
    console.error("[Generate Template] Error:", error)
    return { success: false, error: String(error) }
  }
}
