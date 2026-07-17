const router = require('express').Router();
const { Role, Permission } = require('../models/Role');
const createCRUD = require('../controllers/crudController');
const { protect, can } = require('../middleware/auth');

const crud = createCRUD(Role, 'permissions');

router.use(protect);
router.get('/permissions', async (req, res) => res.json(await Permission.find()));
router.get('/', crud.getAll);
router.get('/:id', crud.getOne);
router.post('/', can('settings', 'create'), crud.create);
router.put('/:id', can('settings', 'edit'), crud.update);
router.delete('/:id', can('settings', 'delete'), crud.remove);

module.exports = router;
