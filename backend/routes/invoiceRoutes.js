const express = require('express');
const router = express.Router();
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  searchCustomers,
  downloadInvoicePdf,
} = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');

// All invoice routes require authentication
router.use(protect);

router.route('/customers/search').get(searchCustomers);

router.route('/')
  .post(createInvoice)
  .get(getInvoices);

router.route('/:id/pdf')
  .get(downloadInvoicePdf);

router.route('/:id')
  .get(getInvoiceById)
  .put(updateInvoice)
  .delete(deleteInvoice);

module.exports = router;
