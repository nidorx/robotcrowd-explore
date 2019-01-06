# robotcrowd-explore https://nidorx.github.io/robotcrowd-explore/RobotCrowd-Explorer.html

Ferramenta para visualizar, editar e salvar os setups do Metatrader para os robos RobotCrowd (https://robotcrowd.com.br/robos).

Facilita a configuração dos inputs dos robos (alguns deles possui mais de uma centena de parametros).

Permite o Download do arquivo de setup (RC-NOME_ROBO.set) e o Upload de um setup pronto.


## Build

A documentação dos inputs e enums dos robos estão nos arquivos docs.txt e docs_gl.txt. A partir dessa documentação é gerado a ferramenta (RobotCrowd-Explorer.html).

Sempre que atualizar as entradas dos robos, atualizar tambem a documentação.

Para fazer o build, é necessário ter instalado o node.js. Na linha de comando:

```
node ./build.js
```

<div align="center">
    <img
        src="https://github.com/nidorx/robotcrowd-explore/raw/master/preview.png"
        alt="Preview" style="max-width:100%;">
</div>
