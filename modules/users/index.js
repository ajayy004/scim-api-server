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
        if (filter && filter.op === 'eq' && filter.attrPath === 'userName') {
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
            res.status(204).send();
        }

        let resources = [];
        for (const user of users) {
            resources.push(createSCIMUser(user));
        }

        res.send(createSCIMUserList(resources, query.startIndex, totalUser));
    } catch (error) {
        return res
            .status(500)
            .send(createSCIMError('Something went wrong', 500));
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
            res.status(204).send();
        }
        res.send(createSCIMUser(user));
    } catch (error) {
        res.status(500).send(createSCIMError('Something went wrong', 500));
    }
});

/**
 * POST {{baseUrl}}/scim/v2/Users
 * Create a new user
 */
router.post('/', async (req, res) => {
    try {
        const { body } = req;
        const primaryEmail = body.emails.find((r) => r.primary);
        const userCount = await prisma.users.count({
            where: {
                email: primaryEmail.value,
            },
        });

        if (userCount > 0) {
            return res
                .status(409)
                .send(createSCIMError('Conflict - User already exists', 409));
        }

        const user = await prisma.users.create({
            data: {
                firstName: body.name.givenName,
                lastName: body.name.familyName,
                email: primaryEmail.value,
                active: body.active,
            },
        });

        res.send(createSCIMUser(user));
    } catch (error) {
        res.status(500).send(createSCIMError('Something went wrong', 500));
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
            if (operations.op === 'replace') {
                if (typeof operations.value.active === 'boolean') {
                    data.active = operations.value.active;
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
        res.status(500).send(createSCIMError('Something went wrong', 500));
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
        const primaryEmail = body.emails.find((r) => r.primary);

        const user = await prisma.users.update({
            where: {
                id: userId,
            },
            data: {
                firstName: body.name.givenName,
                lastName: body.name.familyName,
                email: primaryEmail.value,
                active: body.active,
            },
        });

        res.send(createSCIMUser(user));
    } catch (error) {
        res.status(500).send(createSCIMError('Something went wrong', 500));
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
        res.status(500).send(createSCIMError('Something went wrong', 500));
    }
});

module.exports = router;
