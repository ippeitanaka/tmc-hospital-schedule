// Nクラス学生のデバッグスクリプト
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugNClass() {
  console.log('=== Nクラス学生の調査 ===\n')

  // 全学生を取得して昼夜別にカウント
  const { data: allStudents, error: allError } = await supabase
    .from('students')
    .select('*')
    .order('id')

  if (allError) {
    console.error('エラー:', allError)
    return
  }

  console.log(`総学生数: ${allStudents.length}`)
  
  // 昼夜別カウント
  const dayNightCounts = {}
  allStudents.forEach(s => {
    dayNightCounts[s.day_night] = (dayNightCounts[s.day_night] || 0) + 1
  })
  console.log('昼夜別学生数:', dayNightCounts)

  // Nクラス（夜間）の学生を取得
  const nClassStudents = allStudents.filter(s => s.day_night === 'N' || s.day_night === 'n')
  console.log(`\nNクラス学生数: ${nClassStudents.length}`)

  if (nClassStudents.length > 0) {
    console.log('\n=== Nクラス学生の最初の3名 ===')
    nClassStudents.slice(0, 3).forEach(s => {
      console.log(`ID: ${s.id}`)
      console.log(`  氏名: ${s.name}`)
      console.log(`  かな: ${s.kana}`)
      console.log(`  昼夜: "${s.day_night}"`)
      console.log(`  班名: ${s.group_name}`)
      console.log(`  病院: ${s.hospital}`)
      console.log('---')
    })

    // 名前検索テスト
    console.log('\n=== 名前検索テスト ===')
    const testStudent = nClassStudents[0]
    const testName = testStudent.name.split(' ')[0] // 姓のみ
    console.log(`テスト対象: ${testStudent.name} (${testStudent.kana})`)
    console.log(`検索文字列: "${testName}"`)

    const { data: searchResult, error: searchError } = await supabase
      .from('students')
      .select('*')
      .or(`name.ilike.%${testName}%,kana.ilike.%${testName}%`)

    if (searchError) {
      console.error('検索エラー:', searchError)
    } else {
      console.log(`検索結果: ${searchResult.length}件`)
      const nClassInResult = searchResult.filter(s => s.day_night === 'N' || s.day_night === 'n')
      console.log(`  Nクラス: ${nClassInResult.length}件`)
      console.log(`  他クラス: ${searchResult.length - nClassInResult.length}件`)
    }

    // かな検索テスト
    const testKana = testStudent.kana.split(' ')[0]
    console.log(`\nかな検索文字列: "${testKana}"`)
    
    const { data: kanaResult, error: kanaError } = await supabase
      .from('students')
      .select('*')
      .or(`name.ilike.%${testKana}%,kana.ilike.%${testKana}%`)

    if (kanaError) {
      console.error('かな検索エラー:', kanaError)
    } else {
      console.log(`かな検索結果: ${kanaResult.length}件`)
      const nClassInKanaResult = kanaResult.filter(s => s.day_night === 'N' || s.day_night === 'n')
      console.log(`  Nクラス: ${nClassInKanaResult.length}件`)
    }
  } else {
    console.log('Nクラスの学生が見つかりませんでした')
    console.log('\n全学生の昼夜フィールドの値:')
    const uniqueDayNight = [...new Set(allStudents.map(s => s.day_night))]
    uniqueDayNight.forEach(dn => {
      console.log(`  "${dn}": ${allStudents.filter(s => s.day_night === dn).length}件`)
    })
  }
}

debugNClass().catch(console.error)
