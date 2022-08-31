const express = require('express');
const router = new express.Router();
const { PrismaClient } = require('@prisma/client');
const {
    createSCIMUserList,
    createSCIMUser,
    createSCIMError,
} = require('../../utils/scim');

const prisma = new PrismaClient();

/**
 * GET {{baseUrl}}/scim/v2/Users
 * List users with or without a filter
 */
router.get('/', async (req, res) => {
    try {
        const { query = {} } = req;
        const { count, filter } = query;

        let where = {};
        if (
            filter &&
            filter.op &&
            filter.op.toLowerCase() === 'eq' &&
            filter.attrPath === 'userName'
        ) {
            where['email'] = filter.compValue;
        }

        const [users, totalUser] = await Promise.all([
            prisma.users.findMany({
                where,
                skip: parseInt(query.startIndex || 1, 10) - 1,
                take: parseInt(count || 100, 10),
            }),
            prisma.users.count(),
        ]);

        if (!users) {
            return res.status(404).send();
        }

        let resources = [];
        for (const user of users) {
            resources.push(createSCIMUser(user));
        }

        return res.send(
            createSCIMUserList(resources, query.startIndex, totalUser)
        );
    } catch (error) {
        return res.status(500).send(createSCIMError(error.message, 500));
    }
});

/**
 * GET {{baseUrl}}/scim/v2/Users/{{userId}}
 * Get a user by ID
 */
router.get('/:userId', async (req, res) => {
    try {
        const {
            params: { userId },
        } = req;
        const user = await prisma.users.findUnique({
            where: {
                id: userId,
            },
        });
        if (!user) {
            return res.status(404).send();
        }
        return res.send(createSCIMUser(user));
    } catch (error) {
        return res.status(500).send(createSCIMError(error.message, 500));
    }
});

/**
 * POST {{baseUrl}}/scim/v2/Users
 * Create a new user
 */
router.post('/', async (req, res) => {
    try {
        const { body } = req;
        const primaryEmail =
            body.emails?.find((r) => r.primary).value || body.userName;
        const userCount = await prisma.users.count({
            where: {
                email: primaryEmail,
            },
        });

        if (userCount > 0) {
            return res
                .status(409)
                .send(createSCIMError('Conflict - User already exists', 409));
        }

        const user = await prisma.users.create({
            data: {
                firstName: body.name?.givenName || body.displayName,
                lastName: body.name?.familyName || body.displayName,
                email: primaryEmail,
                active: body.active,
            },
        });

        return res.send(createSCIMUser(user));
    } catch (error) {
        return res.status(500).send(createSCIMError(error.message, 500));
    }
});

/**
 * PATCH {{baseUrl}}/scim/v2/Users/{{userId}}
 * Update a user's attribute
 */
router.patch('/:userId', async (req, res) => {
    try {
        const {
            params: { userId },
            body,
        } = req;

        let data = {};

        for (const operations of body['Operations']) {
            if (operations.op && operations.op.toLowerCase() === 'replace') {
                if (typeof operations.value.active === 'boolean') {
                    data.active = operations.value.active;
                }

                if (operations.path === 'displayName') {
                    data.firstName = operations.value;
                }
            }
        }

        if (Object.keys(data).length > 0) {
            const user = await prisma.users.update({
                where: {
                    id: userId,
                },
                data,
            });
            return res.send(createSCIMUser(user));
        }

        throw new Error('No operations found');
    } catch (error) {
        res.status(500).send(createSCIMError(error.message, 500));
    }
});

/**
 * PUT {{baseUrl}}/scim/v2/Users/{{userId}}
 * Update a user's attribute
 */
router.put('/:userId', async (req, res) => {
    try {
        const {
            params: { userId },
            body,
        } = req;
        const primaryEmail =
            body.emails?.find((r) => r.primary).value || body.displayName;

        const user = await prisma.users.update({
            where: {
                id: userId,
            },
            data: {
                firstName: body.name?.givenName || body.displayName,
                lastName: body.name?.familyName || body.displayName,
                email: primaryEmail,
                active: body.active,
            },
        });

        return res.send(createSCIMUser(user));
    } catch (error) {
        return res.status(500).send(createSCIMError(error.message, 500));
    }
});

/**
 * DELETE {{baseUrl}}/scim/v2/Users/{{userId}}
 * Delete a User by ID
 */
router.delete('/:userId', async (req, res) => {
    try {
        await prisma.users.delete({
            where: {
                id: req.params.userId,
            },
        });
        return res.status(204).send();
    } catch (error) {
        return res.status(500).send(createSCIMError(error.message, 500));
    }
});

module.exports = router;
