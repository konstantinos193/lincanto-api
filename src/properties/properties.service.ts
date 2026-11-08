import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyQueryDto } from './dto/property-query.dto';
import { getPagination } from '../common/utils/pagination.util';
import { PropertyType as PrismaPropertyType } from '../../prisma/generated/prisma';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: PropertyQueryDto) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'desc', location, type, guests, minPrice, maxPrice, amenities, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      status: status || 'ACTIVE',
    };

    if (location) {
      // No `mode: 'insensitive'` — the datasource is SQLite, where Prisma rejects
      // that argument outright. SQLite's LIKE is already case-insensitive for ASCII.
      where.OR = [
        { city: { contains: location } },
        { address: { contains: location } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (guests) {
      where.maxGuests = { gte: guests };
    }

    if (minPrice || maxPrice) {
      where.basePrice = {};
      if (minPrice) where.basePrice.gte = minPrice;
      if (maxPrice) where.basePrice.lte = maxPrice;
    }

    if (amenities) {
      const amenityList = amenities.split(',');
      where.amenities = {
        some: {
          amenity: {
            nameEn: { in: amenityList },
          },
        },
      };
    }

    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          amenities: {
            include: {
              amenity: true,
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.property.count({ where }),
    ]);

    const propertiesWithRatings = properties.map((property) => {
      const avgRating =
        property.reviews.length > 0
          ? property.reviews.reduce((sum, review) => sum + review.rating, 0) / property.reviews.length
          : 0;

      return {
        ...property,
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount: property._count.reviews,
      };
    });

    const pagination = getPagination(page, limit, total);

    return {
      success: true,
      data: {
        properties: propertiesWithRatings,
        pagination,
      },
    };
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true,
          },
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
        reviews: {
          include: {
            guest: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        availability: {
          where: {
            available: true,
            date: {
              gte: new Date(),
            },
          },
          orderBy: {
            date: 'asc',
          },
          take: 30,
        },
        _count: {
          select: {
            reviews: true,
            bookings: true,
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const avgRating =
      property.reviews.length > 0
        ? property.reviews.reduce((sum, review) => sum + review.rating, 0) / property.reviews.length
        : 0;

    return {
      success: true,
      data: {
        ...property,
        averageRating: Math.round(avgRating * 10) / 10,
      },
    };
  }

  async create(createPropertyDto: CreatePropertyDto, ownerId: string) {
    const { amenities, cancellationPolicy, propertyGroupId, type, ...propertyData } = createPropertyDto;
    const property = await this.prisma.property.create({
      data: {
        ...propertyData,
        type: type as PrismaPropertyType,
        owner: {
          connect: { id: ownerId },
        },
        cancellationPolicy: cancellationPolicy as any,
        ...(propertyGroupId && {
          propertyGroup: {
            connect: { id: propertyGroupId },
          },
        }),
        amenities: {
          create: (amenities || []).map((amenityId) => ({
            amenityId,
          })),
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Property created successfully',
      data: property,
    };
  }

  async update(id: string, updatePropertyDto: UpdatePropertyDto) {
    const existingProperty = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!existingProperty) {
      throw new NotFoundException('Property not found');
    }

    // Extract amenities from DTO if present
    const { amenities, ...updateData } = updatePropertyDto;

    // Prepare update data
    const data: any = { ...updateData };

    // Handle amenities separately if provided
    if (amenities !== undefined) {
      // Delete existing amenities and create new ones
      data.amenities = {
        deleteMany: {},
        create: amenities.map((amenityId) => ({
          amenityId,
        })),
      };
    }

    const property = await this.prisma.property.update({
      where: { id },
      data,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        amenities: {
          include: {
            amenity: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Property updated successfully',
      data: property,
    };
  }

  async remove(id: string) {
    const existingProperty = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!existingProperty) {
      throw new NotFoundException('Property not found');
    }

    await this.prisma.property.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Property deleted successfully',
    };
  }

  async getAvailability(id: string, startDate?: string, endDate?: string) {
    const where: any = {
      propertyId: id,
      available: true,
    };

    if (startDate) {
      where.date = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.date = {
        ...where.date,
        lte: new Date(endDate),
      };
    }

    const availability = await this.prisma.propertyAvailability.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
    });

    return {
      success: true,
      data: availability,
    };
  }
}

