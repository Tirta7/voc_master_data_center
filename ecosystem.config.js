module.exports = {
    apps: [
        {
            name: "VOC-Backend",
            cwd: "./backend",
            script: "./dist/main.js",
            node_args: "--max-old-space-size=4096",
            restart_delay: 5000,
            exp_backoff_restart_delay: 100,
            max_restarts: 10,
            error_file: "../logs/backend-error.log",
            out_file: "../logs/backend-out.log",
            env: {
                NODE_ENV: "production"
            }
        },
        {
            name: "VOC-Frontend",
            cwd: "./frontend",
            script: "./node_modules/next/dist/bin/next",
            args: "start -p 3001 -H 0.0.0.0",
            node_args: "--max-old-space-size=4096",
            restart_delay: 5000,
            exp_backoff_restart_delay: 100,
            max_restarts: 10,
            error_file: "../logs/frontend-error.log",
            out_file: "../logs/frontend-out.log",
            env: {
                NODE_ENV: "production"
            }
        }
    ]
};
