# Instruction for localhost running

## Require
1. [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/en/)
2. docker
    - [docker for windows](https://docs.docker.com/docker-for-windows/install/)
    - [docker for macOS](https://docs.docker.com/docker-for-mac/install/)
    - [docker for linux](https://docs.docker.com/install/linux/docker-ce/ubuntu/)
3. [docker-compose](https://docs.docker.com/compose/install/)
4. [composer](https://getcomposer.org/download/)

******************************************************************************************
## Installation

### Install dependencies
1. Install javascript dependencies

        npm install

    or

        yarn install

2. Install php dependencies

        composer install

### Build docker

    docker-compose build

### Other Setup

1. Create a Google API key
2. Create a Google Service Account and store credential in gg-calendar.json
3. Copy file `.env.example` to `.env`

******************************************************************************************
## Usage
1. Build essential files

        npm run build
    or

        yarn build

2. Run docker

        docker-compose up

3. Open http://localhost:8080

******************************************************************************************
## Resources

You can also refer the below resources to know more details about Essential JS 2 components.

* [Pure JS Demos](http://ej2.syncfusion.com/demos/)
* [Pure JS Documentation](http://ej2.syncfusion.com/documentation/)
