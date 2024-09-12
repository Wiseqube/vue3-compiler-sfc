import {
    parse,
    compileTemplate,
    compileScript,
    compileStyle,
} from '@vue/compiler-sfc';

import {
	codeFrameColumns,
} from '@babel/code-frame';

let log = console.log

// tools
/**
 * @internal
 */
function formatError(message, path, source) {
	return path + '\n' + message;
}


/**
 * @internal
 */
function formatErrorLineColumn(message, path, source, line, column) {
	if (!line) {
		return formatError(message, path, source)
	}

  const location = {
    start: { line, column },
  };

  return formatError(codeFrameColumns(source, location, { message }), path, source)
}

/**
 * @internal
 */
function formatErrorStartEnd(message, path, source, start, end) {
	if (!start) {
	  return formatError(message, path, source)
  }

  const location = {
    start: { line: 1, column: start }
  };
  if (end) {
    location.end = {line: 1, column: end}
  }

  return formatError(codeFrameColumns(source, location, { message }), path, source)
}

const rootContext = process.cwd();
import hash from 'hash-sum';
import path from 'path';
import fs from 'fs-extra';

const compiler = (compilerOptions = {}) => {
    let {
        input,
        output
    } = compilerOptions;
    let file = fs.readFileSync(input).toString();
    const shortFilePath = path
        .relative(rootContext, input)
        .replace(/^(\.\.[\/\\])+/, '')
        .replace(/\\/g, '/');
    const scopeId = hash(shortFilePath + '\n' + file);
    
    let parseOptions = {
      filename: input,
    }

    let {
        descriptor,
        errors
    } = parse(file, parseOptions);	

    let hasScoped = descriptor.styles.some(e => e.scoped)

    let options = {
        filename: input,
        source: file,
        id: scopeId,
        inlineTemplate: true,
        isProd: false,
        scoped: hasScoped,
        genDefaultAs: 'script',
        templateOptions: {
            compiler: undefined,
            compilerOptions: {
                scopeId: scopeId,
                bindingMetadata: undefined,
            },
            filename: input,
            id: scopeId,
            isProd: false,
            scoped: hasScoped,
            preprocessCustomRequire: undefined,
            preprocessLang: undefined,
            preprocessOptions: undefined,
            ssr: false,
            ssrCssVars: [],
            transformAssetUrls: undefined,
        }
    }
 
    let code = '';

    if(!descriptor.scriptSetup?.content) {
      options.source = descriptor.template.content;
      let template = compileTemplate(options);
      let templateCode = template.code;
      code += templateCode.replace('export', '');
    }
    if(descriptor.scriptSetup?.content || descriptor.script?.content){
      //options.source = descriptor.scriptSetup.content;
      let script = compileScript(descriptor, options);
      code += script.content;
    }
    let codeParts = code.split('\n');
    codeParts[0] = codeParts[0].replace('import', 'const').replace('"vue"', 'Vue').replace('from', '=').replaceAll('as', ':',);
    code = codeParts.join('\n');

    //scriptCode = scriptCode.replace(/export\s*default/, 'const script = ');
    code += '\nscript.__styles = ['
    descriptor.styles.forEach((style, index) => {
        options.source = style.content;
        let styles = compileStyle(options);
        let styleCode = styles.code.replace(/\n/g, '\\n');
        let cssStr = `\n"${styleCode}",`;
        code += cssStr;
    })
    code += '\n];'
    if(!descriptor.scriptSetup?.content){
      code += '\nscript.render = render;';
    }
    if(hasScoped){
      code += `\nscript.__scopeId = "data-v-${scopeId}"`
    }
    code += `\nscript._file = "${shortFilePath}"`;
    code += '\nexport default script;';

    if (!fs.existsSync(output)) {
        fs.createFileSync(output);
    }
    fs.writeFileSync(output,code);
}

export { compiler }