import express from 'express';
import { exec } from 'child_process';

const app = express();
const port = 3000;

// Middleware to parse JSON requests
app.use(express.json());

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// List systemd units
app.get('/list-units', (req, res) => {
    exec('systemctl list-units --type=service --all --no-legend --no-pager --output=json', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error listing units: ${stderr}`);
            res.status(500).send(`Error listing units: ${stderr}`);
        } else {
            res.json(JSON.parse(stdout));
        }
    });
});

// Start a systemd service
app.post('/start', (req, res) => {
    const serviceName = req.body.serviceName;
    console.log(`Starting service: ${serviceName}`);
    exec(`sudo systemctl start ${serviceName}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error starting service: ${stderr}`);
            res.status(500).send(`Error starting service: ${stderr}`);
        } else {
            console.log(`Service ${serviceName} started successfully.`);
            res.send(`Service ${serviceName} started successfully.`);
        }
    });
});

// Stop a systemd service
app.post('/stop', (req, res) => {
    const serviceName = req.body.serviceName;
    console.log(`Stopping service: ${serviceName}`);
    exec(`sudo systemctl stop ${serviceName}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error stopping service: ${stderr}`);
            res.status(500).send(`Error stopping service: ${stderr}`);
        } else {
            console.log(`Service ${serviceName} stopped successfully.`);
            res.send(`Service ${serviceName} stopped successfully.`);
        }
    });
});

// Restart a systemd service
app.post('/restart', (req, res) => {
    const serviceName = req.body.serviceName;
    console.log(`Restarting service: ${serviceName}`);
    exec(`sudo systemctl restart ${serviceName}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error restarting service: ${stderr}`);
            res.status(500).send(`Error restarting service: ${stderr}`);
        } else {
            console.log(`Service ${serviceName} restarted successfully.`);
            res.send(`Service ${serviceName} restarted successfully.`);
        }
    });
});

// Get the status of a systemd service
app.get('/status/:serviceName', (req, res) => {
    const serviceName = req.params.serviceName;
    console.log(`Fetching status for service: ${serviceName}`);
    exec(`systemctl status ${serviceName} --no-pager`, (error, stdout, stderr) => {
        if (error && error.code !== 3) {
            console.error(`Error getting status of service: ${stderr}`);
            res.status(500).send(`Error getting status of service: ${stderr}`);
        } else {
            res.send(stdout);
        }
    });
});

// Start the server
export function startServer() {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}