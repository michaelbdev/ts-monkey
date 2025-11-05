
# ts-monkey

ts-monkey is a typescript implementation of both a tree-walking interpreter and bytecode compiler & virtual machine for [Monkey](https://monkeylang.org).

## Extensions
My monkey implementation has been extended to support the following new features:

- Friendly error messages that display the offending line of code and underline the exact location of the error.
- Ability to run monkey files (.mo extension)
- comments (both single and multi line) ```// a comment!```  ```/* a multiline comment */ ```

- Logical OR and logical AND operators 
- &lt;= and &gt;= operators
- % operator
- String comparison
- String indexing 
- arrow functions e.g ```let adder = fn x => fn y => x+y; adder(1)(2)``` ```let adder = fn(x,y)=> x+y```
- for in loops ```for(item,index in [1,2,3,4]){
    puts(item+index)}```
- more builtin functions
  - map ```map([1,2,3,4], fn x => x*2)```
  - find ```find(["hello", "world"], fn w => w=="hello")```
  - reduce ```reduce([1,2,3,4], fn(acc,curr) => acc+curr,100)```
  - filter ```filter([1,2,3,4], fn x => x%2==0)```
  - set ```let map = { a: 1 }; set(map,"b",2); map[b] //2```
    
    
       




## Run

Clone the project

```bash
  git clone https://github.com/MichaelB-99/ts-monkey
```

Go to the project directory

```bash
  cd ts-monkey
```

Install dependencies

```bash
  bun install
```

### Run from monkey files
With compiler & vm

```bash
   bun monkey-run -c
```
 With interpreter
```bash
   bun monkey-run 
```
### Using the REPL 
With compiler & vm 
```bash
   bun monkey-repl -c
```
With interpreter
```bash
   bun monkey-repl
```


## Options
- print AST ```--ast```
- print bytecode (compiler only) ```--bytecode```  


## Benchmarking

To run the benchmark run the following:

interpreter
```
bun benchmark --engine=eval
```
vm 

```
bun benchmark --engine=vm
```
