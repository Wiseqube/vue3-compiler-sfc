import { compiler } from "./compiler.js"
import { program } from "commander"

program.requiredOption('-i, --input <char>').requiredOption('-o, --output <char>')

program.parse()

const options = program.opts()
compiler({input: options.input, output: options.output})