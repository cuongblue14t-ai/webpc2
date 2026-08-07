$html = [System.IO.File]::ReadAllText('C:\Users\admin\webpc1\backend\public\admin\index.html')
$start = $html.IndexOf('<script>')
$end = $html.LastIndexOf('</script>')
$js = $html.Substring($start + 8, $end - $start - 8)
[System.IO.File]::WriteAllText('C:\Users\admin\webpc1\backend\public\admin\check_js.js', $js)
Write-Host "Done, length: $($js.Length)"
