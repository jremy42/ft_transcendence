import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../model/user.entity'
import { CreateUserDto } from './dtos/create-user.dto';

@Injectable()
export class UsersService {

	
	constructor(@InjectRepository(User) private repo: Repository<User>){}

	create(dataUser: CreateUserDto){
		console.log(`create user ${dataUser.username} : ${dataUser.email} : ${dataUser.password}`);
		const user = this.repo.create(dataUser);
		console.log(`save user : ${user}`);
		return this.repo.save(user);
	}

	find(email: string) {
		console.log("find :", email);
		return this.repo.find();
	}
}