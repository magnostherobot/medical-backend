import {
  Table,
  Column
} from 'sequelize-typescript';

@Table
class User extends Model<User> {
  @Column
  @PrimaryKey
  username: string;

  @Column
  password: string;

  @CreatedAt
  creationDate: Date;
}
