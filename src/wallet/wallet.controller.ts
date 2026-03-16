import {
  AccessGuard,
  AuthenticatedUser,
  BaseController,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  UserType,
} from '@Common';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import {
  WalletAccountResponse,
  WalletTransactionListResponse,
  WalletTransactionResponse,
} from './wallet.response';
import { DepositWalletDto } from './dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';

@ApiTags('Wallet')
@ApiBearerAuth()
@Roles(UserType.User)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('wallet')
export class WalletController extends BaseController {
  constructor(private readonly walletService: WalletService) {
    super();
  }

  // wallet details
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({ status: 200, type: WalletAccountResponse })
  @Get()
  getWallet(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.walletService.getWalletById(req.user.id);
  }

  // deposit request
  @ApiOperation({ summary: 'Deposit money via UPI/Card' })
  @ApiResponse({ status: 201, type: WalletTransactionResponse })
  @Post('deposit')
  deposit(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: DepositWalletDto,
  ) {
    return this.walletService.deposit(req.user.id, dto.amount, dto.paymentType);
  }

  // get user transactions
  @ApiOperation({ summary: 'Get my transactions' })
  @ApiResponse({ status: 200, type: WalletTransactionListResponse })
  @Get('transactions')
  getMyTransactions(
    @Req() req: Request & { user: AuthenticatedUser },
    @Query() query: TransactionQueryDto,
  ) {
    return this.walletService.getUserTransactions(req.user.id, {
      skip: query.skip,
      take: query.take,
      transactionType: query.transactionType,
      referenceType: query.referenceType,
    });
  }
}

@ApiTags('Admin Wallet')
@ApiBearerAuth()
@Roles(UserType.Admin)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('admin/wallet')
export class AdminWalletController extends BaseController {
  constructor(private readonly walletService: WalletService) {
    super();
  }

  @ApiOperation({ summary: 'Get all transactions (admin)' })
  @ApiResponse({ status: 200, type: WalletTransactionListResponse })
  @Get('transactions')
  getAllTransactions(@Query() query: TransactionQueryDto) {
    return this.walletService.getAllTransactions({
      skip: query.skip,
      take: query.take,
      transactionType: query.transactionType,
      referenceType: query.referenceType,
    });
  }

  @ApiOperation({ summary: 'Get transactions by userId (admin)' })
  @ApiResponse({ status: 200, type: WalletTransactionListResponse })
  @Get('transactions/:userId')
  getUserTransactionsByAdmin(
    @Param('userId') userId: string,
    @Query() query: TransactionQueryDto,
  ) {
    return this.walletService.getAllTransactions({
      skip: query.skip,
      take: query.take,
      transactionType: query.transactionType,
      referenceType: query.referenceType,
      userId,
    });
  }
}
