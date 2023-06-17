const { body } = require('express-validator');

module.exports = {

    createwalletValidator: [
        body('firstname').isString().not().isEmpty(),
        body('lastname').isString().not().isEmpty(),
        body('middlename').isString().optional(),
        body('dob').isString().not().isEmpty(),
        body('address').isString().not().isEmpty(),
        body('gender').isString().not().isEmpty(),
        body('phone').isString().not().isEmpty(),
        body('bvn').isString().not().isEmpty(),
    ],
    // Doctors prescription ie showing the authenticity of d drug, details of the drug, 
    // Invoice -> to carry details of the prescriptions eg 100ml of paracetamol
    // Those invoice are backed up with the company letter head. It should show the time of delivery of that item
    // A minimum of 585k for 5tonns GIG price

    deleteSubCategoryValidator: [
        body('id').isString().not().isEmpty()
    ],
    
    updateSubCategoryValidator: [
        body('id').isString().not().isEmpty(),
        body('subcategory_name').isString().not().isEmpty()
    ],

    getSubCategoryValidator: [
        body('category_id').isString().not().isEmpty()
    ],

}