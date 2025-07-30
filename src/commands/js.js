//javascript in miao shell
import * as vfs from './vfs.js';

const jsCommands = {
    execute: (term, args) => {
        if (args.length === 0){
            term.writeln('\r\nUsage: js execute <file.js>');
        }
        else {
            const fileName = args[0];
            const currentDir = vfs.cwd();
            const file = currentDir[fileName];
            
            if (file === undefined) {
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
    },
    open: (term, args) => {
        if (args.length === 0) {
            term.writeln('\r\nUsage: js open <file.html>');
            return;
        }
        const fileName = args[0];
        const currentDir = vfs.cwd();
        const file = currentDir[fileName];
        
        if (file === undefined) {
            term.writeln(`\r\nNo such file: ${fileName}`);
            return;
        }
        if (typeof file !== 'string') {
            term.writeln(`\r\n${fileName} does not contain valid HTML content.`);
            return;
        }
        if (!fileName.endsWith('.html')) {
            term.writeln(`\r\n${fileName} is not a valid HTML file name.`);
            return;
        }
        // Open the HTML file in a new window using Blob and Object URL
        const blob = new Blob([file], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Optionally, revoke the object URL after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
};

export const commands = {
    js: (term, args) => {
        if (args.length === 0) {
            term.writeln('\r\nAvailable js commands: execute, open');
            term.writeln('Usage: js <command> [arguments]');
            return;
        }
        const subCommand = args[0].toLowerCase();
        const subArgs = args.slice(1);
        if (jsCommands[subCommand]) {
            jsCommands[subCommand](term, subArgs);
        } else {
            term.writeln(`\r\nUnknown js command: ${subCommand}`);
            term.writeln('Available js commands: execute, open');
        }
    }
};
