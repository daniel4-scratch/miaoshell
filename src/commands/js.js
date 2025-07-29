//javascript in miao shell
import * as vfs from './vfs.js';

export const commands = {
    execute: (term, args) => {
        if (args.length === 0){
            term.writeln('\r\nUsage: js execute <file.js>');
        }
        else {
            const fileName = args[0];
            const file = vfs.cwd()[fileName];
            if (!file) {
                term.writeln(`\r\nNo such file: ${fileName}`);
                return;
            }
            if (typeof file !== 'string') {
                term.writeln(`\r\n${fileName} is not a valid JavaScript file.`);
                return;
            }
            try {
                const script = new Function(file);
                script();
                term.writeln(`\r\nExecuted ${fileName} successfully.`);
            } catch (error) {
                term.writeln(`\r\nError executing ${fileName}: ${error.message}`);
            }
        }
    }
};
