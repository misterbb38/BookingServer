// controllers/paymentController.js

const asyncHandler = require('express-async-handler');
const Payment = require('../models/PaymentModel');

exports.getPaymentStats = asyncHandler(async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Construire la condition de filtrage
    let match = {
      payment_status: 'success', // Ne considérer que les paiements réussis
    };

    // Filtrer par date si les paramètres sont fournis
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) {
        match.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        match.createdAt.$lte = new Date(endDate);
      }
    }

    // Pipeline d'agrégation
    const pipeline = [
      { $match: match },
      {
        $project: {
          itemPrice: { $toDouble: '$item_price' }, // Convertir item_price en nombre
          createdAt: 1,
          paymentType: {
            // Déterminer le type de paiement (avance ou final) à partir de ref_command
            $cond: [
              { $regexMatch: { input: '$ref_command', regex: /-avance$/ } },
              'advance',
              {
                $cond: [
                  { $regexMatch: { input: '$ref_command', regex: /-reste$/ } },
                  'final',
                  'unknown',
                ],
              },
            ],
          },
        },
      },
      {
        $facet: {
          daily: [
            {
              $group: {
                _id: {
                  date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                  paymentType: '$paymentType',
                },
                totalAmount: { $sum: '$itemPrice' },
              },
            },
            {
              $group: {
                _id: '$_id.date',
                payments: {
                  $push: {
                    paymentType: '$_id.paymentType',
                    totalAmount: '$totalAmount',
                  },
                },
              },
            },
            { $sort: { _id: 1 } },
          ],
          weekly: [
            {
              $group: {
                _id: {
                  year: { $isoWeekYear: '$createdAt' },
                  week: { $isoWeek: '$createdAt' },
                  paymentType: '$paymentType',
                },
                totalAmount: { $sum: '$itemPrice' },
              },
            },
            {
              $group: {
                _id: { year: '$_id.year', week: '$_id.week' },
                payments: {
                  $push: {
                    paymentType: '$_id.paymentType',
                    totalAmount: '$totalAmount',
                  },
                },
              },
            },
            { $sort: { '_id.year': 1, '_id.week': 1 } },
          ],
          monthly: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                  paymentType: '$paymentType',
                },
                totalAmount: { $sum: '$itemPrice' },
              },
            },
            {
              $group: {
                _id: { year: '$_id.year', month: '$_id.month' },
                payments: {
                  $push: {
                    paymentType: '$_id.paymentType',
                    totalAmount: '$totalAmount',
                  },
                },
              },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
          ],
          totals: [
            {
              $group: {
                _id: '$paymentType',
                totalAmount: { $sum: '$itemPrice' },
              },
            },
          ],
        },
      },
    ];

    const stats = await Payment.aggregate(pipeline);

    res.status(200).json({ success: true, data: stats[0] });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de paiement :', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques de paiement.',
    });
  }
});
