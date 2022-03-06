import { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

export type GetTransactionsApi = {
  transactions: {
    id: string;
    amount: number;
    description: string;
    date: string;
    type: string;
  }[];
  total: number;
};

export default async function GetTransactions(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const userId = req.query.id;

    if (typeof userId !== 'string') {
      return res.status(400).json({
        message: 'Invalid ID',
      });
    }

    // get parameters
    const destinationUserId = req.query.destinationUserId;

    if (typeof destinationUserId !== 'string') {
      return res.status(400).json({
        message: 'Invalid destinationUser',
      });
    }

    try {
      const _transactions = await prisma.transaction.findMany({
        where: {
          OR: [
            {
              userId,
              destinationUserId,
            },
            {
              userId: destinationUserId,
              destinationUserId: userId,
            },
          ],
        },
        select: {
          id: true,
          user: true,
          date: true,
          amount: true,
          description: true,
        },
        orderBy: {
          date: 'desc',
        },
      });

      const transactions = _transactions.map(
        ({ id, user, date, amount, description }) => ({
          id,
          amount,
          description,
          date: format(date, 'd MMMM yyyy'),
          type:
            description === 'Payment'
              ? 'payment'
              : user.id === userId
              ? 'piutang'
              : 'utang',
        })
      );

      const total = transactions.reduce(
        (acc, { amount, type }) =>
          type === 'utang' ? acc + amount : acc - amount,
        0
      );

      const transactionReturn: GetTransactionsApi = { transactions, total };

      return res.status(200).json(transactionReturn);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientUnknownRequestError)
        return res.status(500).send(error.message);
      else {
        throw error;
      }
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}