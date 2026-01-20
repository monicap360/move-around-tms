 = 'app/page.tsx'
 = Get-Content  -Raw
 = '      <section id= load-hub className=load-management-hub>'
 = 
 + '      {profitLeakOpen'
 = .IndexOf()
 = .IndexOf(,  + 1)
if ( -lt 0) { throw 'Second load-hub not found' }
 = .IndexOf(, )
if ( -lt 0) { throw 'End marker not found' }
 = .Substring(0, ) + .Substring()
Set-Content  
