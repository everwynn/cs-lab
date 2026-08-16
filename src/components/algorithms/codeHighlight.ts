// ============================================================
// codeHighlight.ts — 语法高亮工具函数（Java + Shell）
// ============================================================

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const javaTokenPattern = new RegExp(
  '(\\/\\/.*$)|' +
  '("(?:[^"\\\\]|\\\\.)*")|' +
  '(\\b(?:public|private|protected|static|final|abstract|void|int|long|double|float|boolean|char|byte|short|class|interface|extends|implements|new|for|while|do|if|else|switch|case|break|continue|return|import|package|this|super|null|true|false|try|catch|finally|throw|throws|instanceof)\\b)|' +
  '(\\b\\d+\\b)|' +
  '(\\b[A-Z][a-zA-Z0-9]*\\b)',
  'g'
)

export function highlightJava(line: string): string {
  return highlightWithPattern(line, javaTokenPattern)
}

// Shell / Bash 高亮
const shellTokenPattern = new RegExp(
  '(#.*$)|' +                              // 注释
  '("(?:[^"\\\\]|\\\\.)*")|' +             // 双引号字符串
  "('[^']*')|" +                           // 单引号字符串
  '(\\b(?:git|echo|vim|cat|cd|mkdir|rm|cp|mv|chmod|curl|npm|npx|node|python|java|docker)\\b)|' + // 命令
  '(--[a-zA-Z][a-zA-Z0-9-]*)|' +          // 长选项 --flag
  '(-[a-zA-Z])|' +                         // 短选项 -f
  '(\\b(?:HEAD|master|main|develop|feature|release|hotfix|CONFLICT)\\b)', // git 分支/关键字
  'g'
)

export function highlightShell(line: string): string {
  let result = ''
  let remaining = line
  let match: RegExpExecArray | null
  shellTokenPattern.lastIndex = 0

  while ((match = shellTokenPattern.exec(remaining)) !== null) {
    result += escapeHtml(remaining.substring(0, match.index))
    if (match[1]) {
      result += `<span class="text-gray-400 dark:text-slate-500 italic">${escapeHtml(match[1])}</span>`
    } else if (match[2] || match[3]) {
      result += `<span class="text-green-600 dark:text-green-400">${escapeHtml(match[2] || match[3])}</span>`
    } else if (match[4]) {
      result += `<span class="text-cyan-600 dark:text-cyan-400 font-semibold">${match[4]}</span>`
    } else if (match[5]) {
      result += `<span class="text-amber-500 dark:text-amber-400">${match[5]}</span>`
    } else if (match[6]) {
      result += `<span class="text-amber-500 dark:text-amber-400">${match[6]}</span>`
    } else if (match[7]) {
      result += `<span class="text-purple-600 dark:text-purple-400 font-semibold">${match[7]}</span>`
    }
    remaining = remaining.substring(match.index + match[0].length)
    shellTokenPattern.lastIndex = 0
  }
  result += escapeHtml(remaining)
  return result || '&nbsp;'
}

// 通用高亮函数
function highlightWithPattern(line: string, pattern: RegExp): string {
  let result = ''
  let remaining = line
  let match: RegExpExecArray | null
  pattern.lastIndex = 0

  while ((match = pattern.exec(remaining)) !== null) {
    result += escapeHtml(remaining.substring(0, match.index))
    if (match[1]) {
      result += `<span class="text-gray-400 dark:text-slate-500 italic">${escapeHtml(match[1])}</span>`
    } else if (match[2]) {
      result += `<span class="text-green-600 dark:text-green-400">${escapeHtml(match[2])}</span>`
    } else if (match[3]) {
      result += `<span class="text-purple-600 dark:text-purple-400 font-semibold">${match[3]}</span>`
    } else if (match[4]) {
      result += `<span class="text-orange-500 dark:text-orange-400">${match[4]}</span>`
    } else if (match[5]) {
      result += `<span class="text-teal-600 dark:text-teal-400">${match[5]}</span>`
    }
    remaining = remaining.substring(match.index + match[0].length)
    pattern.lastIndex = 0
  }
  result += escapeHtml(remaining)
  return result || '&nbsp;'
}
