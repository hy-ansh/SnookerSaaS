const fs = require('fs');
let code = fs.readFileSync('Dues.tsx', 'utf8');

code = code.replace(/```javascript\n/, '');
code = code.replace(/\/ dues \? q = \$\{ encodeURIComponent\(query\) \} /g, '/dues?q=${encodeURIComponent(query)}');
code = code.replace(/\/ dues \/ settle \/ \$\{ selectedPlayer\.id \} /g, '/dues/settle/${selectedPlayer.id}');
code = code.replace(/Successfully settled dues for \$\{ selectedPlayer\.name \}/g, 'Successfully settled dues for ${selectedPlayer.name}');
code = code.replace(/bg \- white dark: bg \- slate \- 800 p \- 5 rounded \- xl border \- 2 transition \- all cursor \- pointer shadow \- sm hover: shadow \- md \$\{ selectedPlayer\?\.id === player\.id \? 'border-primary ring-2 ring-primary\/20' : 'border-slate-200 dark:border-slate-700 hover:border-primary\/50' \} /g, "bg-white dark:bg-slate-800 p-5 rounded-xl border-2 transition-all cursor-pointer shadow-sm hover:shadow-md ${selectedPlayer?.id === player.id ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 dark:border-slate-700 hover:border-primary/50'}");
code = code.replace(/Table \$\{ item\.session\.table\.nameOrNumber \} /g, 'Table ${item.session.table.nameOrNumber}');

fs.writeFileSync('Dues.tsx', code);
console.log('Fixed Dues.tsx');
