import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';
import { Task } from 'app/modules/admin/apps/tasks/tasks.types';
import moment from 'moment';

import {
    BehaviorSubject,
    Observable,
    filter,
    map,
    of,
    switchMap,
    take,
    tap,
    throwError,
} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TasksService {
    // Private
    private _task: BehaviorSubject<Task | null> = new BehaviorSubject(null);
    private _tasks: BehaviorSubject<Task[] | null> = new BehaviorSubject(null);

    private _url = 'https://localhost:7140/';

    /**
     * Constructor
     */
    constructor(
        private _authService: AuthService,
         private _httpClient: HttpClient) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for task
     */
    get task$(): Observable<Task> {
        return this._task.asObservable();
    }

    /**
     * Getter for tasks
     */
    get tasks$(): Observable<Task[]> {
        return this._tasks.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get tasks
     */
    getTasks(): Observable<Task[]> {
        return this._httpClient.get<Task[]>(this._url + 'api/tasks').pipe(
            tap((response) => {
                this._tasks.next(response);
            })
        );
    }

    /**
     * Update tasks orders
     *
     * @param tasks
     */
    updateTasksOrders(tasks: Task[]): Observable<Task[]> {
        return this._httpClient.patch<Task[]>('api/apps/tasks/order', {
            tasks,
        });
    }

    /**
     * Search tasks with given query
     *
     * @param query
     */
    searchTasks(query: string): Observable<Task[] | null> {
        return this._httpClient.get<Task[] | null>('api/apps/tasks/search', {
            params: { query },
        });
    }

    /**
     * Get task by id
     */
    getTaskById(id: string): Observable<Task> {
        return this._tasks.pipe(
            take(1),
            map((tasks) => {
                const numberId: number = +id;
                // Find the task
                const task = tasks.find((item) => item.id === numberId) || null;

                // Update the task
                this._task.next(task);

                // Return the task
                return task;
            }),
            switchMap((task) => {
                if (!task) {
                    return throwError(
                        'Could not found task with id of ' + id + '!'
                    );
                }

                return of(task);
            })
        );
    }

    /**
     * Create task
     *
     * @param type
     */
    createTask(): Observable<Task> {
        const seedTask: Task = {
            title: "title",
            isChecked: false,
            description: "my description",
            expiryDate: moment().utc().format()
        }
        console.log(seedTask);
        return this.tasks$.pipe(
            take(1),
            switchMap((tasks) =>
                this._httpClient
                    .post<Task>(this._url + 'api/tasks', seedTask)
                    .pipe(
                        map((newTask) => {
                            // Update the tasks with the new task
                            this._tasks.next([newTask, ...tasks]);

                            // Return the new task
                            return newTask;
                        })
                    )
            )
        );
    }

    /**
     * Update task
     *
     * @param id
     * @param task
     */
    updateTask(id: number, task: Task): Observable<Task> {
        return this.tasks$.pipe(
            take(1),
            switchMap((tasks) =>
                this._httpClient
                    .put<Task>(this._url + 'api/tasks/' + id, task)
                    .pipe(
                        map(() => {
                            // Find the index of the updated task
                            const index = tasks.findIndex(
                                (item) => item.id === id
                            );

                            // Update the task
                            tasks[index] = task;

                            // Update the tasks
                            this._tasks.next(tasks);

                            // Return the updated task
                            return task;
                        }),
                        switchMap(() =>
                            this.task$.pipe(
                                take(1),
                                filter((item) => item && item.id === id),
                                tap(() => {
                                    // Update the task if it's selected
                                    this._task.next(task);

                                    // Return the updated task
                                    return task;
                                })
                            )
                        )
                    )
            )
        );
    }

    /**
     * Delete the task
     *
     * @param id
     */
    deleteTask(id: number): Observable<boolean> {
        return this.tasks$.pipe(
            take(1),
            switchMap((tasks) =>
                this._httpClient
                    .delete(this._url + 'api/tasks/' + id, { params: { id } })
                    .pipe(
                        map((isDeleted: boolean) => {
                            // Find the index of the deleted task
                            const index = tasks.findIndex(
                                (item) => item.id === id
                            );

                            // Delete the task
                            tasks.splice(index, 1);

                            // Update the tasks
                            this._tasks.next(tasks);

                            // Return the deleted status
                            return isDeleted;
                        })
                    )
            )
        );
    }
}
