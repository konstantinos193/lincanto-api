import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentUserWithRole } from '../common/decorators/current-user-with-role.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  findAll(
    @Query('propertyId') propertyId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.findAll(propertyId, page, limit);
  }

  /** Admin listing: includes reviews hidden from the public site. */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  findAllForAdmin(
    @Query('propertyId') propertyId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.findAll(propertyId, page, limit, true);
  }

  @Get('property/:propertyId')
  getPropertyReviews(@Param('propertyId') propertyId: string) {
    return this.reviewsService.getPropertyReviews(propertyId);
  }

  // Public, token-authed flow for the lincanto.gr/review page. No login:
  // the JWT signed with the booking id in the guest's email is the
  // authorization. Declared before @Get(':id') so 'public' is not captured
  // as an id.
  @Get('public/booking-info')
  bookingInfo(@Query('token') token: string) {
    return this.reviewsService.getBookingReviewInfo(token ?? '');
  }

  @Post('public/submit')
  submitPublic(
    @Body() body: { token?: string; rating?: number; title?: string; comment?: string },
  ) {
    return this.reviewsService.createFromToken(body?.token ?? '', body ?? {});
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createReviewDto: CreateReviewDto,
    @CurrentUser() userId: string,
  ) {
    return this.reviewsService.create(createReviewDto, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @CurrentUserWithRole() user: any,
  ) {
    return this.reviewsService.update(
      id,
      updateReviewDto,
      user?.userId ?? user?.id,
      user?.role,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUserWithRole() user: any) {
    return this.reviewsService.remove(id, user?.userId ?? user?.id, user?.role);
  }
}

