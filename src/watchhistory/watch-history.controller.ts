import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AccessGuard, JwtAuthGuard, Roles, RolesGuard } from '@Common';
import { AuthenticatedUser, UserType } from '@Common';
import { WatchHistoryService } from './watch-history.service';

@ApiTags('Watch History')
@ApiBearerAuth()
@Roles(UserType.User)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('watch-history')
export class WatchHistoryController {
  constructor(private readonly watchHistoryService: WatchHistoryService) {}

  @ApiOperation({ summary: 'Get watch history (max 10)' })
  @Get()
  getHistory(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.watchHistoryService.getHistory(req.user.id);
  }

  @ApiOperation({ summary: 'Update watch history (call when product opens)' })
  @ApiParam({ name: 'productId' })
  @Post(':productId')
  upsert(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('productId') productId: string,
  ) {
    return this.watchHistoryService.upsert(req.user.id, productId);
  }

  @ApiOperation({ summary: 'Remove single item from history' })
  @ApiParam({ name: 'productId' })
  @HttpCode(200)
  @Delete(':productId')
  remove(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('productId') productId: string,
  ) {
    return this.watchHistoryService.remove(req.user.id, productId);
  }
}
