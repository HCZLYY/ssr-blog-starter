# ------------------------------
# remove-duplicate-redlock.ps1
# ------------------------------

# 设置要扫描的目录
$folder = ".\routes"
# 匹配 redlock 声明
$pattern = "const redlock|let redlock|var redlock"

# 遍历所有 .js 文件
Get-ChildItem $folder -Filter "*.js" | ForEach-Object {
    $file = $_.FullName
    # 读取文件内容
    $lines = Get-Content $file -Encoding UTF8
    # 创建时间戳备份
    $backup = "$file.bak.$((Get-Date).ToString('yyyyMMddHHmmss'))"
    Copy-Item $file $backup -Force
    Write-Output "备份已生成： $backup"

    $count = 0
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match $pattern) {
            $count++
            # 第二次及以后出现的重复声明进行注释
            if ($count -gt 1) {
                $lines[$i] = "// [removed duplicate redlock declaration] " + $lines[$i].Trim()
                Write-Output "已注释重复声明： $file 行 $($i+1)"
            }
        }
    }

    # 写回文件
    $lines | Set-Content $file -Encoding UTF8
}

Write-Output "`n扫描完成：所有重复 redlock 声明已处理。"
