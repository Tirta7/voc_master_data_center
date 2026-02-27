
const { DataSource } = require('typeorm');
const { AccessRequest } = require('./backend/dist/auth/entities/access-request.entity');
const { User } = require('./backend/dist/user/entities/user.entity');

const AppDataSource = new DataSource({
    type: "sqlite", // Assuming sqlite based on typical dev local setups here, or change to postgres/mysql if known
    database: "database.sqlite", // Adjust based on project structure
    entities: [AccessRequest, User],
});

AppDataSource.initialize()
    .then(async () => {
        const repo = AppDataSource.getRepository(AccessRequest);
        const req = await repo.findOneBy({ id: 4 });
        console.log('AccessRequest 4:', JSON.stringify(req, null, 2));
        process.exit(0);
    })
    .catch((err) => {
        console.error('DB Error:', err);
        process.exit(1);
    });
