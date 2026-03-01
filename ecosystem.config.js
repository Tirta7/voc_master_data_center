module.exports = {
    apps: [
        {
            name: "VOC-Backend",
            cwd: "./backend",
            script: "./dist/main.js",
            env: {
                NODE_ENV: "production"
            }
        },
        {
            name: "VOC-Frontend",
            cwd: "./frontend",
            script: "./node_modules/next/dist/bin/next",
            args: "start -p 3000 -H 0.0.0.0",
            env: {
                NODE_ENV: "production"
            }
        }
    ]
};
